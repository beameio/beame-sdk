param([String]$pathToPfx,[String]$pathToPfxPwd,[String]$SiteName,[String]$HostName)

$psLog = "C:\powershell.log"

Write-Output $pathToPfx

if(!(Test-Path C:\temp\logs)){
  mkdir C:\temp\logs >$null 2> $psLog
}


$CertificatePassword = get-content $pathToPfxPwd | ConvertTo-SecureString  -Force -AsPlainText
$certPath = $pathToPfx


Write-Host 'Import pfx certificate' $certPath
$certRootStore = “LocalMachine”
$certStore = "My"
$pfx = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
$pfx.Import($certPath,$CertificatePassword,"Exportable,PersistKeySet")
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store($certStore,$certRootStore)
$store.Open('ReadWrite')
$store.Add($pfx)
$store.Close()
$certThumbprint = $pfx.Thumbprint


Write-Host 'Add website' $SiteName
$IISSite = "IIS:\Sites\$SiteName"
Set-ItemProperty $IISSite -name  Bindings -value @{protocol="https";bindingInformation="*:443:$HostName"}
if($applicationPool) { Set-ItemProperty $IISSite -name  ApplicationPool -value $IISApplicationPool }

